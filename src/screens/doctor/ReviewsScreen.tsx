import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  TextInput,
} from 'react-native';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Review {
  id: string;
  patientName: string;
  patientAvatar: any;
  date: string;
  rating: number;
  comment: string;
  replies?: Reply[];
}

interface Reply {
  id: string;
  authorName: string;
  authorAvatar: any;
  date: string;
  comment: string;
}

const reviews: Review[] = [
  {
    id: '1',
    patientName: 'Adrian',
    patientAvatar: require('../../../assets/avatar.png'),
    date: '15 Mar 2024',
    rating: 4,
    comment: "Dr. Edalin Hendry has been my family's trusted doctor for years. Their genuine care and thorough approach to our health concerns make every visit reassuring. Dr. Edalin Hendry's ability to listen and explain complex health issues in understandable terms is exceptional. We are grateful to have such a dedicated physician by our side",
  },
  {
    id: '2',
    patientName: 'Kelly',
    patientAvatar: require('../../../assets/avatar.png'),
    date: '11 Mar 2024',
    rating: 4,
    comment: "I recently completed a series of dental treatments with Dr.Edalin Hendry, and I couldn't be more pleased with the results. From my very first appointment, Dr. Edalin Hendry and their team made me feel completely at ease, addressing all of my concerns with patience and understanding. Their state-of-the-art office and the staff's attention to comfort and cleanliness were beyond impressive.",
    replies: [
      {
        id: '1',
        authorName: 'Dr Edalin Hendry',
        authorAvatar: require('../../../assets/avatar.png'),
        date: '2 days ago',
        comment: 'Thank you so much for taking the time to share your experience at our dental clinic. We are deeply touched by your kind words and thrilled to hear about the positive impact of your treatment. Our team strives to provide a comfortable, welcoming environment for all our patients, and it\'s heartening to know we achieved this for you.',
      },
    ],
  },
  {
    id: '3',
    patientName: 'Samuel',
    patientAvatar: require('../../../assets/avatar.png'),
    date: '05 Mar 2024',
    rating: 4,
    comment: "From my first consultation through to the completion of my treatment, Dr. Edalin Hendry, my dentist, has been nothing short of extraordinary. Dental visits have always been a source of anxiety for me, but Dr. Edalin Hendry's office provided an atmosphere of calm and reassurance that I had not experienced elsewhere. Highly Recommended!",
  },
];

const renderStars = (rating: number) => {
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={16}
          color={star <= rating ? colors.warning : colors.textLight}
        />
      ))}
    </View>
  );
};

export const ReviewsScreen = () => {
  const [overallRating] = useState(4.0);
  const [dateRange, setDateRange] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Overall Rating Section */}
        <View style={styles.overallSection}>
          <View style={styles.overallContent}>
            <View style={styles.ratingSection}>
              <Text style={styles.overallTitle}>Overall Rating</Text>
              <View style={styles.overallStars}>
                <Text style={styles.ratingValue}>{overallRating}</Text>
                {renderStars(Math.floor(overallRating))}
              </View>
            </View>
            <View style={styles.dateRangeContainer}>
              <View style={styles.dateInputContainer}>
                <TextInput
                  style={styles.dateInput}
                  placeholder="From Date - To Date"
                  placeholderTextColor={colors.textLight}
                  value={dateRange}
                  onChangeText={setDateRange}
                />
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              </View>
            </View>
          </View>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsList}>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.patientInfo}>
                  <Image source={review.patientAvatar} style={styles.patientAvatar} />
                  <View>
                    <Text style={styles.patientName}>{review.patientName}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                </View>
                {renderStars(review.rating)}
              </View>
              <View style={styles.reviewContent}>
                <Text style={styles.reviewText}>{review.comment}</Text>
                <TouchableOpacity style={styles.replyButton} activeOpacity={0.7}>
                  <Ionicons name="arrow-undo-outline" size={16} color={colors.primary} />
                  <Text style={styles.replyText}>Reply</Text>
                </TouchableOpacity>
              </View>
              {review.replies && review.replies.length > 0 && (
                <View style={styles.repliesContainer}>
                  {review.replies.map((reply) => (
                    <View key={reply.id} style={styles.replyItem}>
                      <View style={styles.patientInfo}>
                        <Image source={reply.authorAvatar} style={styles.patientAvatar} />
                        <View>
                          <Text style={styles.patientName}>{reply.authorName}</Text>
                          <Text style={styles.reviewDate}>{reply.date}</Text>
                        </View>
                      </View>
                      <Text style={styles.reviewText}>{reply.comment}</Text>
                      <TouchableOpacity style={styles.replyButton} activeOpacity={0.7}>
                        <Ionicons name="arrow-undo-outline" size={16} color={colors.primary} />
                        <Text style={styles.replyText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  overallSection: {
    backgroundColor: colors.background,
    padding: 16,
    marginTop: 16,
  },
  overallContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingSection: {
    flex: 1,
  },
  overallTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  overallStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dateRangeContainer: {
    flex: 1,
    marginLeft: 16,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  reviewsList: {
    padding: 16,
  },
  reviewItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewContent: {
    marginTop: 8,
  },
  reviewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  replyText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 16,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  replyItem: {
    marginTop: 12,
  },
});

